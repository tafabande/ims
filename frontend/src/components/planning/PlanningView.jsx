import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Target, 
  BarChart2, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Package,
  Check,
  Info,
  Clock,
  Layers,
  Sliders,
  DollarSign,
  Percent
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { apiGet } from '../../utils/apiClient';

export default function PlanningView({ currentRole, onShowToast }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'performance' | 'forecast' | 'inventory_outlook' | 'targets'
  const [showMethodModal, setShowMethodModal] = useState(false);

  const [historicalData, setHistoricalData] = useState({
    quarters: [
      { period: "Q3 '25", revenue: 195000, margin_pct: 20.8, refund_rate: 3.8, stock_accuracy: 98.7 },
      { period: "Q4 '25", revenue: 228000, margin_pct: 21.2, refund_rate: 3.2, stock_accuracy: 98.9 },
      { period: "Q1 '26", revenue: 184000, margin_pct: 21.4, refund_rate: 3.1, stock_accuracy: 99.1 },
      { period: "Q2 '26", revenue: 213000, margin_pct: 22.1, refund_rate: 2.9, stock_accuracy: 99.2 },
      { period: "Q3 '26", revenue: 239000, margin_pct: 23.0, refund_rate: 2.7, stock_accuracy: 99.4 }
    ],
    qoq_growth_pct: 12.2,
    yoy_growth_pct: 22.6
  });

  const [forecastData, setForecastData] = useState({
    q4_target: 280000,
    q4_forecast: 266500,
    current_trajectory: 239000,
    gap_amount: 13500,
    gap_pct: 4.8,
    daily_velocity_needed: 450,
    velocity_pct_needed: 5.1,
    projected_shortfall_units: 180,
    reorder_recommended_units: 280
  });

  useEffect(() => {
    apiGet('/planning/historical')
      .then(res => {
        if (res && res.quarters) setHistoricalData(res);
      })
      .catch(() => {});

    apiGet('/planning/forecasts')
      .then(res => {
        if (res && res.revenue_forecast) {
          setForecastData(prev => ({
            ...prev,
            q4_target: res.revenue_forecast.target_value,
            q4_forecast: res.revenue_forecast.forecast_value,
            gap_amount: Math.abs(res.revenue_forecast.gap_value),
            projected_shortfall_units: res.inventory_shortfall_forecast?.projected_shortfall_units || 180,
            reorder_recommended_units: res.inventory_shortfall_forecast?.reorder_recommendation_units || 280
          }));
        }
      })
      .catch(() => {});
  }, []);

  const inventoryOutlookItems = [
    { sku: 'CAT6-300M', name: 'CAT6 Cable Roll 300m', current: 42, forecast_net: -18, recommended: 80, priority: 'CRITICAL' },
    { sku: 'RJ45-100P', name: 'RJ45 Connectors (Pack of 100)', current: 120, forecast_net: 34, recommended: 100, priority: 'NORMAL' },
    { sku: 'RTR-X2000', name: 'Enterprise Router X2000', current: 18, forecast_net: 2, recommended: 50, priority: 'HIGH' },
    { sku: 'SWT-Y48', name: 'Managed Switch Y48-Port', current: 15, forecast_net: -8, recommended: 50, priority: 'HIGH' }
  ];

  const planPerformanceMatrix = [
    { metric: 'Q3 Revenue', target: '$235,000', actual_forecast: `$${(historicalData.quarters[historicalData.quarters.length - 1]?.revenue || 239000).toLocaleString()}`, status: 'Ahead', color: '#10b981' },
    { metric: 'Q3 Gross Margin', target: '22.0%', actual_forecast: `${historicalData.quarters[historicalData.quarters.length - 1]?.margin_pct || 23.0}%`, status: 'Ahead', color: '#10b981' },
    { metric: 'Q4 Revenue Target', target: `$${(forecastData.q4_target || 280000).toLocaleString()}`, actual_forecast: `$${(forecastData.q4_forecast || 266500).toLocaleString()}`, status: 'At Risk', color: '#f59e0b' },
    { metric: 'Inventory Stock Accuracy', target: '≥ 99.0%', actual_forecast: `${historicalData.quarters[historicalData.quarters.length - 1]?.stock_accuracy || 99.4}%`, status: 'Ahead', color: '#10b981' },
    { metric: 'Customer Refund Rate', target: '< 3.0%', actual_forecast: `${historicalData.quarters[historicalData.quarters.length - 1]?.refund_rate || 2.7}%`, status: 'Ahead', color: '#10b981' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. CLEAN OPERATIONAL HEADER */}
      <div style={{
        background: 'var(--color-paper-surface)',
        border: '1px solid var(--color-rule)',
        borderRadius: 'var(--radius-md)',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-accent)' }}>
              Q3 2026 OPERATIONAL REVIEW
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>• Updated 26 Aug 2026</span>
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Planning & Forecast
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--color-ink-muted)', margin: 0, fontWeight: 500 }}>
            Revenue is ahead of Q2, but Q4 is currently tracking <strong>$13,500 below target</strong>.
          </p>
        </div>

        {/* Forecast Method Metadata Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowMethodModal(true)}
            style={{
              background: 'var(--color-paper-2)',
              border: '1px solid var(--color-rule)',
              borderRadius: 'var(--radius-xs)',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--color-ink-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Info size={14} color="var(--color-accent)" />
            Forecast method · 3-quarter moving average
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE SIGNAL ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        {/* Revenue Signal */}
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-ink-muted)', uppercase: 'true' }}>REVENUE</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'monospace', margin: '4px 0 2px 0', color: 'var(--color-ink)' }}>$239,000</div>
          <div style={{ fontSize: '12px', color: 'var(--color-signal-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={14} /> 12.2% QoQ (Q3 revenue)
          </div>
        </div>

        {/* YoY Growth Signal */}
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-ink-muted)' }}>GROWTH</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'monospace', margin: '4px 0 2px 0', color: 'var(--color-accent)' }}>+22.6%</div>
          <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>vs Q3 2025 revenue</div>
        </div>

        {/* Q4 Outlook (HIGH-EMPHASIS RISK CARD) */}
        <div style={{ background: 'var(--color-paper-surface)', border: '2px solid #f59e0b', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={14} /> Q4 OUTLOOK (AT RISK)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'monospace', margin: '4px 0 2px 0', color: 'var(--color-ink)' }}>$266,500</div>
          <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 800 }}>$13,500 below target</div>
        </div>

        {/* Stock Risk (HIGH-EMPHASIS RISK CARD) */}
        <div style={{ background: 'var(--color-paper-surface)', border: '2px solid #ef4444', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={14} /> STOCK RISK
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'monospace', margin: '4px 0 2px 0', color: '#ef4444' }}>180 units</div>
          <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>280u recommended reorder</div>
        </div>
      </div>

      {/* 3. CLEAN BUSINESS NAVIGATION TABS */}
      <div style={{ borderBottom: '1px solid var(--color-rule)', display: 'flex', gap: '8px' }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'performance', label: 'Performance & Health' },
          { id: 'forecast', label: 'Q4 Forecast' },
          { id: 'inventory_outlook', label: 'Inventory Outlook' },
          { id: 'targets', label: 'Targets' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === tab.id ? 'var(--color-accent)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--color-ink-muted)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW (MASTER MANAGER CONTROL VIEW)                             */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Management Outlook Summary Table */}
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 12px 0', color: 'var(--color-ink)' }}>
              Management Outlook
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)', fontSize: '11px' }}>
                  <th style={{ padding: '8px' }}>SIGNAL</th>
                  <th style={{ padding: '8px' }}>CURRENT POSITION</th>
                  <th style={{ padding: '8px' }}>OUTLOOK</th>
                  <th style={{ padding: '8px' }}>RECOMMENDED MANAGEMENT ACTION</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 700 }}>Revenue</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>$239,000</td>
                  <td style={{ padding: '10px 8px', color: '#f59e0b', fontWeight: 700 }}>$266,500 forecast</td>
                  <td style={{ padding: '10px 8px', color: '#f59e0b', fontWeight: 800 }}>Close $13,500 gap to target</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 700 }}>Inventory</td>
                  <td style={{ padding: '10px 8px' }}>99.4% stock accuracy</td>
                  <td style={{ padding: '10px 8px', color: '#ef4444', fontWeight: 700 }}>180 units shortfall</td>
                  <td style={{ padding: '10px 8px', color: '#ef4444', fontWeight: 800 }}>Reorder 280 units (CAT6 & Switches)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 700 }}>Margin</td>
                  <td style={{ padding: '10px 8px' }}>23.0% gross margin</td>
                  <td style={{ padding: '10px 8px' }}>Stable</td>
                  <td style={{ padding: '10px 8px', color: 'var(--color-ink-muted)' }}>Monitor price discounts</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 8px', fontWeight: 700 }}>Refunds</td>
                  <td style={{ padding: '10px 8px' }}>2.7% refund rate</td>
                  <td style={{ padding: '10px 8px', color: '#10b981', fontWeight: 700 }}>Improving</td>
                  <td style={{ padding: '10px 8px', color: 'var(--color-signal-green)', fontWeight: 700 }}>No action required</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Revenue Trajectory Graph + Operational Signals */}
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>Revenue Trajectory & Operational Insights</h3>
                <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>5-Quarter Revenue Trend ($195k ➔ $239k)</span>
              </div>

              {/* Operational Signal Indicators */}
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: 800 }}>
                <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>Revenue: ↑</span>
                <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>Margin: ↑</span>
                <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>Refunds: ↓</span>
                <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>Stock Accuracy: ↑</span>
              </div>
            </div>

            {/* Visual Recharts Revenue Area Trend Graph */}
            <div style={{ height: '220px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData.quarters}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="period" stroke="var(--color-ink-muted)" fontSize={12} />
                  <YAxis stroke="var(--color-ink-muted)" fontSize={12} tickFormatter={val => `$${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)', borderRadius: '4px' }}
                    formatter={(val) => [`$${val.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--color-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Q4 Target vs Forecast & "What Changes the Outcome?" */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Q4 Revenue Target vs Forecast Visual */}
            <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px 0', color: 'var(--color-ink)' }}>Q4 Revenue Outlook</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    <span>Target</span>
                    <span>$280,000</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--color-paper-2)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: 'var(--color-accent)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    <span>Forecast</span>
                    <span style={{ color: '#f59e0b' }}>$266,500</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--color-paper-2)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '95%', height: '100%', background: '#f59e0b' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    <span>Current Trajectory</span>
                    <span>$239,000</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--color-paper-2)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '85%', height: '100%', background: 'var(--color-ink-muted)' }} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', padding: '10px 12px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-xs)', fontSize: '12px' }}>
                <strong style={{ color: '#f59e0b' }}>$13,500 gap to target (4.8% below target)</strong>
                <div style={{ color: 'var(--color-ink-muted)', marginTop: '2px' }}>At current sales trajectory, Q4 is expected to finish below quota.</div>
              </div>
            </div>

            {/* "What Changes the Outcome?" Action Plan */}
            <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px 0', color: 'var(--color-ink)' }}>What Changes the Outcome?</h3>
              
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginBottom: '12px' }}>
                To close the <strong>$13,500 gap</strong> to Q4 Target:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-paper-2)', padding: '10px 12px', borderRadius: 'var(--radius-xs)' }}>
                  <TrendingUp size={16} color="var(--color-accent)" />
                  <div><strong>+$450 / day</strong> sales increase over remaining 30 days</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-paper-2)', padding: '10px 12px', borderRadius: 'var(--radius-xs)' }}>
                  <Percent size={16} color="var(--color-signal-green)" />
                  <div>Approximately <strong>+5.1% sales velocity boost</strong></div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-paper-2)', padding: '10px 12px', borderRadius: 'var(--radius-xs)' }}>
                  <Package size={16} color="#8b5cf6" />
                  <div>Equivalent additional units at current average selling price</div>
                </div>
              </div>
            </div>

          </div>

          {/* Stock Shortfall Operational Block */}
          <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--color-ink)' }}>Inventory Outlook (180 Units Shortfall Projected)</h3>
                <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>Recommended Replenishment: <strong>280 units</strong> (Demand + Lead Time + Safety Buffer)</span>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)', fontSize: '11px' }}>
                  <th style={{ padding: '8px' }}>SKU & ITEM NAME</th>
                  <th style={{ padding: '8px' }}>CURRENT STOCK</th>
                  <th style={{ padding: '8px' }}>NET FORECAST</th>
                  <th style={{ padding: '8px' }}>RECOMMENDED REORDER</th>
                </tr>
              </thead>
              <tbody>
                {inventoryOutlookItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                    <td style={{ padding: '10px 8px' }}>
                      <strong>{item.name}</strong><br />
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-accent)' }}>{item.sku}</span>
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{item.current} units</td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: item.forecast_net < 0 ? '#ef4444' : 'var(--color-ink)', fontWeight: 700 }}>
                      {item.forecast_net > 0 ? `+${item.forecast_net}` : item.forecast_net} units
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: 'var(--color-signal-green)', fontWeight: 800 }}>
                      +{item.recommended} units
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PERFORMANCE & BUSINESS HEALTH                                      */}
      {/* ========================================================================= */}
      {activeTab === 'performance' && (
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--color-ink)' }}>Business Health & Operational Benchmarks</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'var(--color-paper-2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink-muted)' }}>GROSS MARGIN</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'monospace', margin: '4px 0' }}>23.0%</div>
              <div style={{ fontSize: '12px', color: 'var(--color-signal-green)', fontWeight: 700 }}>↑ 0.9pp YoY</div>
            </div>

            <div style={{ background: 'var(--color-paper-2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink-muted)' }}>REFUND RATE</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'monospace', margin: '4px 0' }}>2.7%</div>
              <div style={{ fontSize: '12px', color: 'var(--color-signal-green)', fontWeight: 700 }}>↓ 1.1pp YoY</div>
            </div>

            <div style={{ background: 'var(--color-paper-2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink-muted)' }}>STOCK ACCURACY</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'monospace', margin: '4px 0' }}>99.4%</div>
              <div style={{ fontSize: '12px', color: 'var(--color-signal-green)', fontWeight: 700 }}>↑ 0.7pp YoY</div>
            </div>

            <div style={{ background: 'var(--color-paper-2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-rule)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink-muted)' }}>UNITS SOLD</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'monospace', margin: '4px 0' }}>15,600</div>
              <div style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 700 }}>↑ 11% QoQ</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TARGETS & PERFORMANCE AGAINST PLAN                                 */}
      {/* ========================================================================= */}
      {(activeTab === 'targets' || activeTab === 'forecast' || activeTab === 'inventory_outlook') && (
        <div style={{ background: 'var(--color-paper-surface)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px 0', color: 'var(--color-ink)' }}>Performance Against Plan Matrix</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-rule)', textAlign: 'left', color: 'var(--color-ink-muted)', fontSize: '11px' }}>
                <th style={{ padding: '8px' }}>METRIC</th>
                <th style={{ padding: '8px' }}>PLAN TARGET</th>
                <th style={{ padding: '8px' }}>ACTUAL / FORECAST</th>
                <th style={{ padding: '8px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {planPerformanceMatrix.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 700 }}>{row.metric}</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{row.target}</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{row.actual_forecast}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', background: `${row.color}20`, color: row.color, fontWeight: 800, fontSize: '11px' }}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: FORECAST METHOD EXPLANATION */}
      {showMethodModal && (
        <div className="modal-overlay" onClick={() => setShowMethodModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 12px 0', color: 'var(--color-ink)' }}>Forecast Calculation Methodology</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-muted)', lineHeight: 1.5 }}>
              Forecasts are calculated using deterministic 3-quarter moving historical averages and configured lead-time stock parameters. No generative AI is used in calculating inventory or financial projections.
            </p>
            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <button className="btn btn-primary" onClick={() => setShowMethodModal(false)}>Got It</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
