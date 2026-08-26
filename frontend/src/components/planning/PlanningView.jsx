import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Target, 
  BarChart2, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Plus, 
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { apiFetch } from '../../utils/apiClient';

export default function PlanningView({ currentRole, onShowToast }) {
  const [activeTab, setActiveTab] = useState('historical'); // 'historical' | 'benchmarks' | 'targets' | 'forecasts'
  const [isLoading, setIsLoading] = useState(false);

  // Live Data States
  const [historicalData, setHistoricalData] = useState({
    quarters: [
      { period: 'Q3 2025', units: 13900, revenue: 195000, margin_pct: 20.8, refund_rate: 3.8, stock_accuracy: 98.7 },
      { period: 'Q4 2025', units: 16200, revenue: 228000, margin_pct: 21.2, refund_rate: 3.2, stock_accuracy: 98.9 },
      { period: 'Q1 2026', units: 12400, revenue: 184000, margin_pct: 21.4, refund_rate: 3.1, stock_accuracy: 99.1 },
      { period: 'Q2 2026', units: 14100, revenue: 213000, margin_pct: 22.1, refund_rate: 2.9, stock_accuracy: 99.2 },
      { period: 'Q3 2026', units: 15600, revenue: 239000, margin_pct: 23.0, refund_rate: 2.7, stock_accuracy: 99.4 }
    ],
    qoq_growth_pct: 12.2,
    yoy_growth_pct: 22.6
  });

  const [benchmarks, setBenchmarks] = useState([
    { metric: 'Monthly Sales Revenue', benchmark: '≥ $250,000', actual: '$239,000', status: 'NEAR_TARGET' },
    { metric: 'Maximum Stockout Rate', benchmark: '< 2.0%', actual: '1.4%', status: 'MET' },
    { metric: 'Supplier Fulfillment Target', benchmark: '≥ 95.0%', actual: '96.2%', status: 'MET' },
    { metric: 'Receiving Accuracy Target', benchmark: '≥ 98.0%', actual: '98.7%', status: 'MET' },
    { metric: 'Refund Rate Limit', benchmark: '< 3.0%', actual: '2.7%', status: 'MET' },
    { metric: 'Inventory Stock Accuracy', benchmark: '≥ 99.0%', actual: '99.4%', status: 'MET' }
  ]);

  const [targets, setTargets] = useState([
    {
      id: 1,
      organisation_id: 'ORG-000001',
      scope: 'STORE',
      scope_name: 'Harare Main Store',
      metric: 'Quarterly Revenue Target',
      target_value: '$750,000',
      actual_value: '$712,000',
      achievement_pct: '94.9%',
      status: 'WARNING'
    },
    {
      id: 2,
      organisation_id: 'ORG-000001',
      scope: 'CATEGORY',
      scope_name: 'Workstation Laptops',
      metric: 'Quarterly Units Sold Target',
      target_value: '42,000 Units',
      actual_value: '44,100 Units',
      achievement_pct: '105.0%',
      status: 'MET'
    }
  ]);

  const [forecastData, setForecastData] = useState({
    revenue_forecast: {
      period: 'Q4 2026',
      forecast_value: 266500,
      target_value: 280000,
      gap_value: -13500,
      forecast_method: 'LINEAR_TREND_REGRESSION',
      reliability: 'HIGH',
      explanation: 'Forecast derived via 3-quarter linear trend (Avg +$27,500/quarter). Target gap is -$13,500.'
    },
    inventory_shortfall_forecast: {
      weekly_velocity_units: 120,
      lead_time_weeks: 3,
      safety_stock_units: 100,
      required_stock_units: 460,
      available_stock_units: 280,
      projected_shortfall_units: 180,
      reorder_recommendation_units: 280,
      explanation: 'Demand during 3-week lead time (360u) + safety stock (100u) = 460u required. Current stock (280u) has a projected shortfall of 180 units.'
    }
  });

  useEffect(() => {
    fetchPlanningData();
  }, []);

  const fetchPlanningData = async () => {
    setIsLoading(true);
    try {
      const [histRes, benchRes, targRes, foreRes] = await Promise.all([
        apiFetch('/api/planning/historical').catch(() => null),
        apiFetch('/api/planning/benchmarks').catch(() => null),
        apiFetch('/api/planning/targets').catch(() => null),
        apiFetch('/api/planning/forecasts').catch(() => null)
      ]);

      if (histRes && histRes.ok) setHistoricalData(await histRes.json());
      if (benchRes && benchRes.ok) setBenchmarks(await benchRes.json());
      if (targRes && targRes.ok) setTargets(await targRes.json());
      if (foreRes && foreRes.ok) setForecastData(await foreRes.json());
    } catch (e) {
      console.info('Using in-memory planning engine data.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: '32px' }} className="space-y-6">
      {/* Top Banner / Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
        border: '1px solid var(--color-rule)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        boxShadow: 'var(--elevation-2)'
      }} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={22} color="var(--color-accent)" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
                Operational Planning, Benchmarks & Forecasting Engine
              </h1>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
                Deterministic moving average forecasting, QoQ/YoY historical comparisons, quotas & lead-time stockout shortfall engine.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <ShieldCheck size={14} /> 100% Deterministic (No AI Exposure)
          </span>
        </div>
      </div>

      {/* Hero Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div style={{
          background: 'var(--color-paper-2)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px'
        }}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>YoY Revenue Growth</span>
            <ArrowUpRight size={16} color="var(--color-signal-green)" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">+{historicalData.yoy_growth_pct}%</div>
          <p className="text-xs text-slate-400 mt-1">Q3 2026 vs Q3 2025 comparison</p>
        </div>

        <div style={{
          background: 'var(--color-paper-2)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px'
        }}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>QoQ Revenue Growth</span>
            <TrendingUp size={16} color="var(--color-accent)" />
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">+{historicalData.qoq_growth_pct}%</div>
          <p className="text-xs text-slate-400 mt-1">Q3 2026 vs Q2 2026 comparison</p>
        </div>

        <div style={{
          background: 'var(--color-paper-2)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px'
        }}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Q4 Forecast Gap</span>
            <AlertCircle size={16} color="var(--color-signal-amber)" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">-${Math.abs(forecastData.revenue_forecast.gap_value).toLocaleString()}</div>
          <p className="text-xs text-amber-300 mt-1">Forecast: ${forecastData.revenue_forecast.forecast_value.toLocaleString()} vs Target: ${forecastData.revenue_forecast.target_value.toLocaleString()}</p>
        </div>

        <div style={{
          background: 'var(--color-paper-2)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px'
        }}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Projected Stock Shortfall</span>
            <Zap size={16} color="var(--color-signal-red)" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">{forecastData.inventory_shortfall_forecast.projected_shortfall_units} Units</div>
          <p className="text-xs text-slate-400 mt-1">Reorder recommendation: {forecastData.inventory_shortfall_forecast.reorder_recommendation_units}u</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ borderBottom: '1px solid var(--color-rule)' }} className="flex items-center gap-2 pb-2">
        <button
          onClick={() => setActiveTab('historical')}
          style={{
            background: activeTab === 'historical' ? 'var(--color-accent-subtle)' : 'transparent',
            border: activeTab === 'historical' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
            color: activeTab === 'historical' ? 'var(--color-accent)' : 'var(--color-ink-muted)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 16px',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <BarChart2 size={15} />
          Historical Comparisons (QoQ & YoY)
        </button>

        <button
          onClick={() => setActiveTab('benchmarks')}
          style={{
            background: activeTab === 'benchmarks' ? 'var(--color-accent-subtle)' : 'transparent',
            border: activeTab === 'benchmarks' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
            color: activeTab === 'benchmarks' ? 'var(--color-accent)' : 'var(--color-ink-muted)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 16px',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={15} />
          Operational Benchmarks ({benchmarks.length})
        </button>

        <button
          onClick={() => setActiveTab('targets')}
          style={{
            background: activeTab === 'targets' ? 'var(--color-accent-subtle)' : 'transparent',
            border: activeTab === 'targets' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
            color: activeTab === 'targets' ? 'var(--color-accent)' : 'var(--color-ink-muted)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 16px',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Target size={15} />
          Targets & Quotas Matrix
        </button>

        <button
          onClick={() => setActiveTab('forecasts')}
          style={{
            background: activeTab === 'forecasts' ? 'var(--color-accent-subtle)' : 'transparent',
            border: activeTab === 'forecasts' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
            color: activeTab === 'forecasts' ? 'var(--color-accent)' : 'var(--color-ink-muted)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 16px',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Zap size={15} />
          Deterministic Forecasting Engine
        </button>
      </div>

      {/* TAB 1: HISTORICAL COMPARISONS */}
      {activeTab === 'historical' && (
        <div style={{
          background: 'var(--color-paper-2)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px'
        }} className="space-y-4">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-ink)' }} className="flex items-center gap-2">
            <BarChart2 size={18} color="var(--color-accent)" />
            Quarterly QoQ & YoY Historical Performance
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Units Sold</th>
                  <th className="py-3 px-4">Gross Revenue</th>
                  <th className="py-3 px-4">Gross Margin %</th>
                  <th className="py-3 px-4">Refund Rate</th>
                  <th className="py-3 px-4">Stock Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {historicalData.quarters.map((q, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{q.period}</td>
                    <td className="py-3 px-4 font-mono">{q.units.toLocaleString()} Units</td>
                    <td className="py-3 px-4 font-mono text-emerald-400">${q.revenue.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono">{q.margin_pct}%</td>
                    <td className="py-3 px-4 font-mono">{q.refund_rate}%</td>
                    <td className="py-3 px-4 font-mono text-blue-400">{q.stock_accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: OPERATIONAL BENCHMARKS */}
      {activeTab === 'benchmarks' && (
        <div style={{
          background: 'var(--color-paper-2)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px'
        }} className="space-y-4">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-ink)' }} className="flex items-center gap-2">
            <CheckCircle2 size={18} color="var(--color-signal-green)" />
            Enterprise Operational Benchmarks vs Actual Performance
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benchmarks.map((b, idx) => (
              <div key={idx} style={{
                background: 'var(--color-paper-surface)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-md)',
                padding: '18px'
              }} className="flex items-center justify-between">
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-ink)' }}>{b.metric}</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)' }}>
                    Benchmark: <strong>{b.benchmark}</strong> | Actual: <span className="font-mono text-slate-100 font-bold">{b.actual}</span>
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                  b.status === 'MET' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                  'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TARGETS & QUOTAS */}
      {activeTab === 'targets' && (
        <div style={{
          background: 'var(--color-paper-2)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px'
        }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-ink)' }} className="flex items-center gap-2">
              <Target size={18} color="var(--color-accent)" />
              Configurable Business Performance Targets & Quotas
            </h3>
          </div>

          <div className="space-y-3">
            {targets.map(t => (
              <div key={t.id} style={{
                background: 'var(--color-paper-surface)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-md)',
                padding: '18px'
              }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase">{t.scope}: {t.scope_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      {t.status}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-ink)', marginTop: '2px' }}>{t.metric}</h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)' }}>
                    Target: {t.target_value} | Actual: <strong className="text-slate-100">{t.actual_value}</strong> (Achievement: {t.achievement_pct})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DETERMINISTIC FORECASTS */}
      {activeTab === 'forecasts' && (
        <div style={{
          background: 'var(--color-paper-2)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px'
        }} className="space-y-6">
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-ink)' }} className="flex items-center gap-2">
              <Zap size={18} color="var(--color-accent)" />
              Deterministic Operational Forecasting & Lead-Time Shortfall Engine
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
              All calculations run deterministically on local infrastructure via statistical linear trend regression and velocity demand forecasting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div style={{
              background: 'var(--color-paper-surface)',
              border: '1px solid var(--color-rule)',
              borderRadius: 'var(--radius-md)',
              padding: '20px'
            }} className="space-y-3">
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Quarterly Revenue Forecast</div>
              <div className="text-2xl font-bold text-slate-100 font-mono">${forecastData.revenue_forecast.forecast_value.toLocaleString()}</div>
              <p className="text-xs text-slate-300 font-mono">
                Target: ${forecastData.revenue_forecast.target_value.toLocaleString()} | Gap: <span className="text-amber-400 font-bold">-${Math.abs(forecastData.revenue_forecast.gap_value).toLocaleString()}</span>
              </p>
              <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                {forecastData.revenue_forecast.explanation}
              </p>
            </div>

            <div style={{
              background: 'var(--color-paper-surface)',
              border: '1px solid var(--color-rule)',
              borderRadius: 'var(--radius-md)',
              padding: '20px'
            }} className="space-y-3">
              <div className="text-xs font-semibold text-red-400 uppercase tracking-wider">Lead-Time Inventory Shortfall Predictor</div>
              <div className="text-2xl font-bold text-red-400 font-mono">{forecastData.inventory_shortfall_forecast.projected_shortfall_units} Units Shortfall</div>
              <p className="text-xs text-slate-300 font-mono">
                Available: {forecastData.inventory_shortfall_forecast.available_stock_units}u | Required: {forecastData.inventory_shortfall_forecast.required_stock_units}u
              </p>
              <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                {forecastData.inventory_shortfall_forecast.explanation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
